import { useTranslation } from "react-i18next";

/** RTL languages in LinQi (Kurdish Sorani + Arabic). */
export function isRtlLang(lang: string): boolean {
  return lang === "ku" || lang === "ar";
}

/** Shared hook for translated strings + document direction. */
export function useLocaleDir(namespace?: string) {
  const { t, i18n } = useTranslation(namespace);
  const lang = i18n.language;
  const rtl = isRtlLang(lang);
  const dir = rtl ? "rtl" : "ltr";
  return { t, i18n, lang, rtl, dir };
}
