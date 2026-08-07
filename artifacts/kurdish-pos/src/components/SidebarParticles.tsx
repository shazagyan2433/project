import type { RefObject } from "react";

export function SidebarParticles({
  sidebarRef: _sidebarRef,
}: {
  sidebarRef: RefObject<HTMLElement | null>;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Top-left deep blue glow */}
      <div style={{
        position: "absolute",
        top: "-60px",
        left: "-40px",
        width: "260px",
        height: "260px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(26,106,255,0.07) 0%, transparent 70%)",
        filter: "blur(24px)",
      }} />

      {/* Bottom-right neon orange glow */}
      <div style={{
        position: "absolute",
        bottom: "-40px",
        right: "-40px",
        width: "200px",
        height: "200px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,107,0,0.05) 0%, transparent 70%)",
        filter: "blur(20px)",
      }} />

      {/* Mid subtle blue accent */}
      <div style={{
        position: "absolute",
        top: "45%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "180px",
        height: "180px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)",
        filter: "blur(16px)",
      }} />
    </div>
  );
}
