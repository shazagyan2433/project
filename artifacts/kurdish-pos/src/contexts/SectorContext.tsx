import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  type CatKey,
  getDefaultSectorCategory,
  getStrictSectorCategories,
} from "@/lib/industries";
import {
  useUserSectorKey,
  useSectorCategoryOptions,
  useSectorLabel,
} from "@/hooks/useSectorScope";

export interface SectorContextValue {
  /** Canonical onboarding sector key (from sectorKey / businessSector / linqi_sector). */
  sectorKey: string | null;
  /** Alias for sectorKey — matches API `businessSector` field semantics. */
  businessSector: string | null;
  sectorLabel: string;
  categoryOptions: Array<{ key: CatKey; label: string }>;
  categoryKeys: CatKey[];
  defaultCategory: CatKey | null;
  isSectorKnown: boolean;
}

const SectorContext = createContext<SectorContextValue | null>(null);

/** Global sector scope — derived from auth profile, never static category lists. */
export function SectorProvider({ children }: { children: ReactNode }) {
  const sectorKey = useUserSectorKey();
  const categoryOptions = useSectorCategoryOptions();
  const sectorLabel = useSectorLabel();

  const value = useMemo<SectorContextValue>(() => {
    const categoryKeys = getStrictSectorCategories(sectorKey);
    return {
      sectorKey,
      businessSector: sectorKey,
      sectorLabel,
      categoryOptions,
      categoryKeys,
      defaultCategory: getDefaultSectorCategory(sectorKey),
      isSectorKnown: Boolean(sectorKey),
    };
  }, [sectorKey, categoryOptions, sectorLabel]);

  return <SectorContext.Provider value={value}>{children}</SectorContext.Provider>;
}

export function useSectorContext(): SectorContextValue {
  const ctx = useContext(SectorContext);
  if (!ctx) {
    throw new Error("useSectorContext must be used within SectorProvider");
  }
  return ctx;
}

/** Safe variant for components that may render outside SectorProvider (returns null sector). */
export function useSectorContextOptional(): SectorContextValue | null {
  return useContext(SectorContext);
}
