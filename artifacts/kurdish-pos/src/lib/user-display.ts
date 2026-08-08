import type { TFunction } from "i18next";
import i18n from "@/i18n";
import type { AuthUser } from "@/contexts/AuthContext";

let sectorLabelCache: Set<string> | null = null;

/** Collect localized onboarding sector names — never use these as profile/header titles. */
function getSectorLabelStrings(): Set<string> {
  if (sectorLabelCache) return sectorLabelCache;
  const labels = new Set<string>();
  const langs = ["ku", "ar", "en"];
  const namespaces = ["auth", "translation"];

  for (const lang of langs) {
    for (const ns of namespaces) {
      const onboard = i18n.getResourceBundle(lang, ns)?.onboard as Record<string, string> | undefined;
      if (!onboard) continue;
      for (const [key, value] of Object.entries(onboard)) {
        if (key.startsWith("sector_") && typeof value === "string" && value.trim()) {
          labels.add(value.trim());
        }
      }
    }
  }

  sectorLabelCache = labels;
  return labels;
}

export function isSectorDisplayLabel(value: string | null | undefined): boolean {
  const text = value?.trim();
  if (!text) return false;
  return getSectorLabelStrings().has(text);
}

/** Role label for shell UI when business name is missing or equals a sector label. */
export function getUserRoleLabel(user: AuthUser | null | undefined, t: TFunction): string {
  if (!user) return "";
  if (user.role === "admin") return t("role.admin");
  if (user.role === "buyer") return t("role.buyer", { defaultValue: "کڕیار" });
  if (user.role === "supplier") return t("role.supplier", { defaultValue: "فرۆشیار" });
  if (user.role === "driver") return t("role.driver", { defaultValue: "شۆفێر" });
  return t("role.staff");
}

/**
 * Profile / header display name — business or person name, never an onboarding sector label.
 */
export function resolveDisplayUserName(
  user: AuthUser | null | undefined,
  t?: TFunction,
): string {
  if (!user) return "";

  const candidates = [
    user.storeName?.trim(),
    user.name?.trim(),
    user.username?.trim(),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const cleaned = candidate.replace(/^Dev\s+/i, "");
    if (!isSectorDisplayLabel(cleaned)) return cleaned;
  }

  if (t) return getUserRoleLabel(user, t);
  return candidates[0]?.replace(/^Dev\s+/i, "") ?? "";
}
