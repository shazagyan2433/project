import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGetProducts } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  type CatKey,
  type NavFeatureKey,
  resolveUserSectorKey,
  normalizeSectorKey,
  getSectorNavFeatures,
  getAllowedCategoriesForSector,
  filterProductsBySector,
  isNavFeatureAllowed,
} from "@/lib/industries";

/** Resolved onboarding sector for the current merchant session. */
export function useUserSectorKey(): string | null {
  const { user } = useAuth();
  return normalizeSectorKey(resolveUserSectorKey(user?.sectorKey));
}

/** Localized display name for the logged-in user's onboarding sector. */
export function useSectorLabel(): string {
  const sectorKey = useUserSectorKey();
  const { t, i18n } = useTranslation("auth");
  return useMemo(() => {
    if (!sectorKey) {
      return i18n.language === "en" ? "Business" : i18n.language === "ar" ? "الأعمال" : "بزنس";
    }
    return t(`onboard.sector_${sectorKey}`, { defaultValue: sectorKey });
  }, [sectorKey, t, i18n.language]);
}

/** Allowed marketplace / inventory category keys for the current sector. */
export function useAllowedSectorCategories(): CatKey[] | null {
  const sectorKey = useUserSectorKey();
  return getAllowedCategoriesForSector(sectorKey);
}

/** Sector-scoped nav feature list (null = unrestricted, e.g. admin). */
export function useSectorNavFeatures(): NavFeatureKey[] | null {
  const { isAdmin } = useAuth();
  const sectorKey = useUserSectorKey();
  return getSectorNavFeatures(isAdmin ? null : sectorKey);
}

export function useSectorNavAllowed(feature: NavFeatureKey): boolean {
  const features = useSectorNavFeatures();
  return isNavFeatureAllowed(feature, features);
}

/** API products strictly filtered to the user's onboarding sector categories. */
export function useSectorFilteredProducts() {
  const sectorKey = useUserSectorKey();
  const query = useGetProducts();
  const data = useMemo(
    () => filterProductsBySector(query.data ?? [], sectorKey),
    [query.data, sectorKey],
  );
  return { ...query, data, sectorKey, allowedCategories: getAllowedCategoriesForSector(sectorKey) };
}
