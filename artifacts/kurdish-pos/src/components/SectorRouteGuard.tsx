import { Redirect } from "wouter";
import { type NavFeatureKey } from "@/lib/industries";
import { useSectorNavAllowed } from "@/hooks/useSectorScope";

/** Blocks merchant routes that are hidden for the user's onboarding sector. */
export function SectorRouteGuard({
  feature,
  children,
}: {
  feature: NavFeatureKey;
  children: React.ReactNode;
}) {
  const allowed = useSectorNavAllowed(feature);
  if (!allowed) return <Redirect to="/" />;
  return <>{children}</>;
}
