import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimation,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";

/* ─── Base gradient backdrop ─────────────────────────────────────── */
function OnboardingBackdrop() {
  return (
    <div className="absolute inset-0 z-0" aria-hidden>
      <div className="absolute inset-0 bg-[#020C1C]" />
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 18% 42%, rgba(29,78,216,0.32) 0%, transparent 70%),
            radial-gradient(ellipse 55% 45% at 88% 12%, rgba(6,182,212,0.18) 0%, transparent 65%),
            radial-gradient(ellipse 70% 50% at 50% 100%, rgba(37,99,235,0.12) 0%, transparent 60%)
          `,
        }}
      />
    </div>
  );
}

/* ─── LinQi glowing brand watermarks ─────────────────────────────── */
const WATERMARKS = [
  { x: "16%", y: "20%", size: "clamp(3rem, 7vw, 5rem)", delay: 0, duration: 5.5 },
  { x: "82%", y: "66%", size: "clamp(2.25rem, 5vw, 3.5rem)", delay: 0.9, duration: 6.2 },
  { x: "50%", y: "90%", size: "clamp(1.75rem, 4vw, 2.75rem)", delay: 1.6, duration: 5.8 },
] as const;

function LinQiBrandWatermarks({ reducedMotion }: { reducedMotion: boolean | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {WATERMARKS.map((mark, i) => (
        <motion.div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2 select-none font-black tracking-tight"
          style={{
            left: mark.x,
            top: mark.y,
            fontSize: mark.size,
            background: "linear-gradient(135deg, rgba(147,197,253,0.45) 0%, rgba(96,165,250,0.22) 55%, rgba(129,140,248,0.18) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 28px rgba(59,130,246,0.25))",
          }}
          animate={
            reducedMotion
              ? { opacity: 0.22 }
              : {
                  opacity: [0.18, 0.3, 0.2, 0.28, 0.18],
                  y: [0, -14, -6, -16, 0],
                  scale: [1, 1.04, 1.01, 1.05, 1],
                }
          }
          transition={
            reducedMotion
              ? { duration: 0 }
              : {
                  duration: mark.duration,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: mark.delay,
                }
          }
        >
          LinQi
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Canvas ambient particles + node network ────────────────────── */
type IconType = "truck" | "cart" | "box" | "store";

function drawAmbientIcon(
  ctx: CanvasRenderingContext2D,
  type: IconType,
  cx: number,
  cy: number,
  size: number,
  alpha: number,
) {
  const s = size / 24;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.strokeStyle = `rgba(186,220,255,${alpha})`;
  ctx.lineWidth = 2 / s;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.scale(s, s);
  if (type === "truck") {
    ctx.beginPath();
    ctx.rect(1, 6, 13, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, 8);
    ctx.lineTo(21, 8);
    ctx.lineTo(23, 11);
    ctx.lineTo(23, 16);
    ctx.lineTo(14, 16);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(5, 18, 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(19, 18, 2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === "cart") {
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(5, 1);
    ctx.lineTo(8.5, 14);
    ctx.lineTo(20.5, 14);
    ctx.lineTo(22, 5);
    ctx.lineTo(6, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9, 20, 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(20, 20, 1.5, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === "box") {
    ctx.beginPath();
    ctx.rect(2, 8, 20, 13);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 8);
    ctx.lineTo(12, 3);
    ctx.lineTo(22, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 8);
    ctx.lineTo(12, 21);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.rect(2, 10, 20, 11);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, 10);
    ctx.lineTo(12, 3);
    ctx.lineTo(23, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(9, 15, 6, 6);
    ctx.stroke();
  }
  ctx.restore();
}

function AmbientParticleField({ reducedMotion }: { reducedMotion: boolean | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const TYPES: IconType[] = ["truck", "cart", "box", "store"];
    const icons = Array.from({ length: 16 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      size: 11 + Math.random() * 9,
      type: TYPES[i % 4],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.01 + Math.random() * 0.014,
      baseAlpha: 0.2 + Math.random() * 0.14,
    }));
    const orbs = [
      { x: window.innerWidth * 0.2, y: window.innerHeight * 0.32, vx: 0.07, vy: 0.05, r: 260 },
      { x: window.innerWidth * 0.78, y: window.innerHeight * 0.68, vx: -0.06, vy: -0.045, r: 210 },
      { x: window.innerWidth * 0.55, y: window.innerHeight * 0.12, vx: 0.04, vy: 0.06, r: 180 },
    ];

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      for (const orb of orbs) {
        orb.x += orb.vx;
        orb.y += orb.vy;
        if (orb.x < -orb.r || orb.x > W + orb.r) orb.vx *= -1;
        if (orb.y < -orb.r || orb.y > H + orb.r) orb.vy *= -1;
        const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        g.addColorStop(0, "rgba(99,179,255,0.14)");
        g.addColorStop(0.45, "rgba(59,130,246,0.06)");
        g.addColorStop(1, "rgba(29,78,216,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const ic of icons) {
        ic.x += ic.vx;
        ic.y += ic.vy;
        ic.pulse += ic.pulseSpeed;
        if (ic.x < -ic.size) ic.x = W + ic.size;
        if (ic.x > W + ic.size) ic.x = -ic.size;
        if (ic.y < -ic.size) ic.y = H + ic.size;
        if (ic.y > H + ic.size) ic.y = -ic.size;
      }

      const MAX = 150;
      for (let i = 0; i < icons.length; i++) {
        for (let j = i + 1; j < icons.length; j++) {
          const dx = icons[i].x - icons[j].x;
          const dy = icons[i].y - icons[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MAX * MAX) {
            const d = Math.sqrt(d2);
            ctx.strokeStyle = `rgba(96,165,250,${(1 - d / MAX) * 0.22})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(icons[i].x, icons[i].y);
            ctx.lineTo(icons[j].x, icons[j].y);
            ctx.stroke();
          }
        }
      }

      for (const ic of icons) {
        drawAmbientIcon(
          ctx,
          ic.type,
          ic.x,
          ic.y,
          ic.size,
          ic.baseAlpha + 0.05 * Math.sin(ic.pulse),
        );
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-80"
      aria-hidden
    />
  );
}

/* ─── Sleek minimalist AI mascot + cart (single visual unit) ─────── */
function ModernRobot({ waving = false, running = false }: { waving?: boolean; running?: boolean }) {
  const uid = "linqi-mascot";

  return (
    <svg
      viewBox="0 0 88 112"
      className="h-[88px] w-[68px] shrink-0 sm:h-[100px] sm:w-[78px]"
      role="presentation"
    >
      <defs>
        <linearGradient id={`${uid}-shell`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#93C5FD" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.82" />
        </linearGradient>
        <linearGradient id={`${uid}-visor`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0C4A6E" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <filter id={`${uid}-eye-glow`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${uid}-soft-shadow`} x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#3B82F6" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter={`url(#${uid}-soft-shadow)`}>
        {/* Floating halo */}
        <ellipse cx="44" cy="108" rx="22" ry="4" fill="rgba(56,189,248,0.18)" />

        {/* Torso — soft pill */}
        <rect x="26" y="58" width="36" height="38" rx="18" fill={`url(#${uid}-shell)`} opacity="0.92" />
        <ellipse cx="44" cy="72" rx="8" ry="8" fill="rgba(14,116,144,0.35)" stroke="rgba(125,211,252,0.45)" strokeWidth="1" />

        {/* Head — round, modern */}
        <circle cx="44" cy="36" r="28" fill={`url(#${uid}-shell)`} />
        <rect x="22" y="28" width="44" height="22" rx="11" fill={`url(#${uid}-visor)`} />
        {/* Neon eyes */}
        <g filter={`url(#${uid}-eye-glow)`}>
          <ellipse cx="34" cy="38" rx="5" ry="6" fill="#22D3EE" />
          <ellipse cx="54" cy="38" rx="5" ry="6" fill="#22D3EE" />
          <ellipse cx="34" cy="37" rx="2" ry="2.5" fill="#FFFFFF" opacity="0.9" />
          <ellipse cx="54" cy="37" rx="2" ry="2.5" fill="#FFFFFF" opacity="0.9" />
        </g>
        <path
          d="M 36 48 Q 44 52 52 48"
          fill="none"
          stroke="rgba(56,189,248,0.5)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Left arm — push pose while running */}
        <motion.g
          animate={running ? { rotate: -28 } : waving ? { rotate: 0 } : { rotate: -18 }}
          transition={{ duration: 0.35 }}
          style={{ transformOrigin: "18px 64px" }}
        >
          <rect x="8" y="56" width="12" height="28" rx="6" fill="rgba(147,197,253,0.75)" />
          <circle cx="14" cy="86" r="6" fill="rgba(56,189,248,0.55)" />
        </motion.g>

        {/* Right arm — wave on greet, push while running */}
        <motion.g
          animate={
            running
              ? { rotate: 18 }
              : waving
                ? { rotate: [8, -32, 12, -28, 8] }
                : { rotate: 22 }
          }
          transition={
            running
              ? { duration: 0.35 }
              : waving
                ? { duration: 0.85, repeat: 2, ease: "easeInOut" }
                : { duration: 0.4 }
          }
          style={{ transformOrigin: "70px 60px", willChange: "transform" }}
        >
          <rect x="68" y="52" width="12" height="30" rx="6" fill="rgba(147,197,253,0.8)" />
          <circle cx="74" cy="84" r="6.5" fill="rgba(56,189,248,0.6)" stroke="rgba(186,230,253,0.5)" strokeWidth="1" />
        </motion.g>
      </g>
    </svg>
  );
}

function GlowingCart() {
  return (
    <svg
      viewBox="0 0 96 56"
      className="h-[52px] w-[80px] shrink-0 sm:h-[58px] sm:w-[88px]"
      role="presentation"
      style={{ willChange: "transform", opacity: 0.88 }}
    >
      <defs>
        <linearGradient id="linqi-cart-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity="0.75" />
        </linearGradient>
        <filter id="linqi-cart-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#linqi-cart-blur)" stroke="url(#linqi-cart-glow)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8h14l10 28H44l5-16H78" />
        <circle cx="22" cy="44" r="5" fill="rgba(56,189,248,0.25)" />
        <circle cx="58" cy="44" r="5" fill="rgba(56,189,248,0.25)" />
        <path d="M78 18h10l6 8v12H44" opacity="0.85" />
      </g>
      {/* Glow fill */}
      <path
        d="M6 8h14l10 28H44l5-16H78"
        fill="rgba(59,130,246,0.08)"
        stroke="none"
      />
    </svg>
  );
}

/** Full-width traverse: left edge → right edge with run bob + mid-screen greeting. */
const TRAVERSE_SECONDS = 7;
const LOOP_PAUSE_SECONDS = 6; // 7s traverse + 6s pause ≈ 13s loop
const TRAVERSE_START_PX = -100;

function traverseEndPx() {
  return typeof window !== "undefined" ? window.innerWidth : 1280;
}

function MascotShowSequence({ reducedMotion }: { reducedMotion: boolean | null }) {
  const traverseControls = useAnimation();
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;
    let bubbleShowTimer: ReturnType<typeof setTimeout> | undefined;
    let bubbleHideTimer: ReturnType<typeof setTimeout> | undefined;

    const clearBubbleTimers = () => {
      if (bubbleShowTimer) clearTimeout(bubbleShowTimer);
      if (bubbleHideTimer) clearTimeout(bubbleHideTimer);
    };

    const runCycle = async () => {
      while (!cancelled) {
        setShowBubble(false);
        clearBubbleTimers();

        const endX = traverseEndPx();

        // Off-screen left → glide across to right edge
        await traverseControls.start(
          { x: TRAVERSE_START_PX, opacity: 0.78 },
          { duration: 0 },
        );

        // Bubble at screen centre (~50% of traverse) for 2s while still moving
        const midMs = TRAVERSE_SECONDS * 0.5 * 1000;
        bubbleShowTimer = setTimeout(() => {
          if (cancelled) return;
          setShowBubble(true);
          bubbleHideTimer = setTimeout(() => {
            if (!cancelled) setShowBubble(false);
          }, 2000);
        }, midMs);

        await traverseControls.start(
          { x: endX, opacity: 0.78 },
          { duration: TRAVERSE_SECONDS, ease: "linear" },
        );

        clearBubbleTimers();
        setShowBubble(false);

        if (cancelled) break;
        await new Promise((r) => setTimeout(r, LOOP_PAUSE_SECONDS * 1000));
      }
    };

    runCycle();
    return () => {
      cancelled = true;
      clearBubbleTimers();
    };
  }, [traverseControls, reducedMotion]);

  if (reducedMotion) {
    return (
      <div
        className="absolute bottom-[12%] start-1/2 hidden -translate-x-1/2 opacity-50 sm:block"
        aria-hidden
      >
        <div className="flex items-end gap-0">
          <ModernRobot running />
          <GlowingCart />
        </div>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[10%] z-[2] hidden h-32 overflow-visible sm:block md:bottom-[12%]"
      aria-hidden
    >
      <div className="absolute inset-x-[4%] bottom-2 h-px bg-gradient-to-r from-transparent via-sky-400/25 to-transparent" />

      <motion.div
        className="absolute bottom-0 left-0 flex items-end"
        style={{ willChange: "transform, opacity" }}
        animate={traverseControls}
        initial={{ x: TRAVERSE_START_PX, opacity: 0.78 }}
      >
        {/* Run bob — independent of horizontal glide */}
        <motion.div
          className="flex items-end gap-0"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.32, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: "transform" }}
        >
          <div className="relative">
            <AnimatePresence>
              {showBubble && (
                <motion.div
                  key="bubble"
                  className="absolute -top-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-2xl border border-white/15 bg-white/[0.08] px-3.5 py-1.5 shadow-lg backdrop-blur-md"
                  initial={{ opacity: 0, y: 8, scale: 0.88 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.9 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <span
                    className="text-sm font-bold tracking-wide text-sky-100"
                    style={{ fontFamily: "Vazirmatn, sans-serif" }}
                  >
                    سڵاو!
                  </span>
                  <span
                    className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-white/15 bg-white/[0.08]"
                    aria-hidden
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <ModernRobot running />
          </div>
          <GlowingCart />
        </motion.div>
      </motion.div>
    </div>
  );
}

export interface OnboardingAmbientProps {
  /** Bumps animation pacing when onboarding step advances. */
  step: number;
}

/** Background ambient layer for `/onboarding` — never blocks form interaction. */
export function OnboardingAmbient({ step }: OnboardingAmbientProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-visible"
      style={{ zIndex: 0 }}
      aria-hidden
    >
      {/* Layer 1 — base gradients */}
      <OnboardingBackdrop />
      {/* Layer 2 — drifting commerce icons + node mesh */}
      <AmbientParticleField reducedMotion={reducedMotion} />
      {/* Layer 3 — LinQi brand watermarks */}
      <LinQiBrandWatermarks reducedMotion={reducedMotion} />
      {/* Layer 4 — hero mascot timeline (above ambient, below form) */}
      <MascotShowSequence key={step} reducedMotion={reducedMotion} />
    </div>
  );
}
