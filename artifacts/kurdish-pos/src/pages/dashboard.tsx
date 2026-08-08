import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import DistributorDashboard from "./dashboard-distributor";
import FactoryDashboard     from "./dashboard-factory";
import MarketDashboard      from "./dashboard-market";
import { PriorityWidgets }  from "@/components/PriorityWidgets";
import { BG } from "./dashboard-tokens";
import { useUserSectorKey } from "@/hooks/useSectorScope";

/* ─────────────────────────────────────────────────────────────────
   SECTOR → DASHBOARD ROUTER
   Priority:
   1. user.sectorKey  (set during registration, persisted on AuthUser)
   2. localStorage.getItem('linqi_sector')  (fallback for offline/cached)
   3. 'other'  → defaults to MarketDashboard
──────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const { t: td } = useTranslation("dashboard");

  const sector: string = useUserSectorKey() ?? "other";

  const Header = (
    <div
      className="px-4 pt-5 pb-0 max-w-[1440px] mx-auto w-full"
      style={{ background: BG }}
    >
      <a
        href="#sector-dashboard"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-bold"
      >
        {td("admin.skipLink", { defaultValue: "Skip to dashboard content" })}
      </a>
      <PriorityWidgets />
    </div>
  );

  switch (sector) {
    case "distributor":
      return (
        <>
          {Header}
          <div id="sector-dashboard" tabIndex={-1}>
            <DistributorDashboard />
          </div>
        </>
      );

    case "manufacturer":
      return (
        <>
          {Header}
          <div id="sector-dashboard" tabIndex={-1}>
            <FactoryDashboard />
          </div>
        </>
      );

    case "supermarket":
    case "retail_shop":
    case "restaurant":
    case "hotel":
    case "pharmacy":
    case "hospital":
    case "office":
    case "delivery":
    case "other":
    default:
      return (
        <>
          {Header}
          <div id="sector-dashboard" tabIndex={-1}>
            <MarketDashboard />
          </div>
        </>
      );
  }
}
