/**
 * LinQi i18n Helper Utilities
 * Enterprise-grade date, number, and currency formatters
 * supporting English (LTR), Arabic MSA (RTL), and Kurdish Sorani (RTL).
 */

export type SupportedLocale = "en" | "ar" | "ku";

// ─── Kurdish Sorani month names (Arabic script) ───────────────────────────────
const KU_MONTHS: Record<number, string> = {
  0:  "کانوونی دووەم",
  1:  "شوبات",
  2:  "ئازار",
  3:  "نیسان",
  4:  "ئایار",
  5:  "حوزەیران",
  6:  "تەمموز",
  7:  "ئاب",
  8:  "ئەیلوول",
  9:  "تشرینی یەکەم",
  10: "تشرینی دووەم",
  11: "کانوونی یەکەم",
};

// ─── Eastern Arabic (Arabic-Indic) digit map ─────────────────────────────────
const EASTERN_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/**
 * Convert Western Arabic digits (0-9) to Eastern Arabic-Indic digits.
 * Used for Arabic and Kurdish Sorani number rendering.
 */
export function toEasternNumerals(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => EASTERN_DIGITS[+d]);
}

// ─── Date Formatter ───────────────────────────────────────────────────────────

/**
 * Format a date according to the active locale.
 *
 * Examples:
 *   en → "July 14, 2026"
 *   ar → "١٤ يوليو ٢٠٢٦"
 *   ku → "١٤ی تەمموزی ٢٠٢٦"
 */
export function formatDate(
  date: Date | string | number,
  locale: SupportedLocale
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);

  if (locale === "en") {
    return new Intl.DateTimeFormat("en-US", {
      year:  "numeric",
      month: "long",
      day:   "numeric",
    }).format(d);
  }

  if (locale === "ar") {
    // Standard Arabic with Arabic-Indic numerals via ar-IQ locale
    return new Intl.DateTimeFormat("ar-IQ", {
      year:  "numeric",
      month: "long",
      day:   "numeric",
    }).format(d);
  }

  if (locale === "ku") {
    // Kurdish Sorani: "١٤ی تەمموزی ٢٠٢٦"
    // Day + Kurdish ezafe "ی" + Kurdish month name + "ی" + year
    const day   = toEasternNumerals(d.getDate());
    const month = KU_MONTHS[d.getMonth()];
    const year  = toEasternNumerals(d.getFullYear());
    return `${day}ی ${month}ی ${year}`;
  }

  return d.toLocaleDateString();
}

/**
 * Format a date showing only day and month (short form).
 *
 * Examples:
 *   en → "14 Jul"
 *   ar → "١٤ يوليو"
 *   ku → "١٤ی تەمموز"
 */
export function formatDateShort(
  date: Date | string | number,
  locale: SupportedLocale
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);

  if (locale === "en") {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  }

  if (locale === "ar") {
    return new Intl.DateTimeFormat("ar-IQ", { month: "long", day: "numeric" }).format(d);
  }

  if (locale === "ku") {
    const day   = toEasternNumerals(d.getDate());
    const month = KU_MONTHS[d.getMonth()];
    return `${day}ی ${month}`;
  }

  return d.toLocaleDateString();
}

/**
 * Format a time string.
 *
 * Examples:
 *   en → "3:45 PM"
 *   ar → "٣:٤٥ م"
 *   ku → "٣:٤٥ د.ن" (دوای نیوەڕۆ)
 */
export function formatTime(
  date: Date | string | number,
  locale: SupportedLocale
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);

  if (locale === "en") {
    return new Intl.DateTimeFormat("en-US", {
      hour:   "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  }

  if (locale === "ar") {
    return new Intl.DateTimeFormat("ar-IQ", {
      hour:   "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  }

  if (locale === "ku") {
    const hours   = d.getHours();
    const minutes = d.getMinutes();
    const isPM    = hours >= 12;
    const h12     = hours % 12 || 12;
    const period  = isPM ? "د.ن" : "ب.ن"; // دواینیوەڕۆ / بەرینیوەڕۆ
    return `${toEasternNumerals(h12)}:${toEasternNumerals(String(minutes).padStart(2, "0"))} ${period}`;
  }

  return d.toLocaleTimeString();
}

// ─── Number Formatter ─────────────────────────────────────────────────────────

/**
 * Format a number with locale-appropriate digit set and separators.
 *
 * Examples:
 *   en → "12,345.67"
 *   ar → "١٢٬٣٤٥٫٦٧"
 *   ku → "١٢٬٣٤٥٫٦٧"
 */
export function formatNumber(
  value: number,
  locale: SupportedLocale,
  options?: Intl.NumberFormatOptions
): string {
  if (locale === "en") {
    return new Intl.NumberFormat("en-US", options).format(value);
  }

  // Both ar and ku use Arabic-Indic digits via ar-IQ locale
  return new Intl.NumberFormat("ar-IQ", {
    useGrouping: true,
    ...options,
  }).format(value);
}

/**
 * Format an integer with grouping separators.
 *
 * Examples:
 *   en → "1,000,000"
 *   ar → "١٬٠٠٠٬٠٠٠"
 *   ku → "١٬٠٠٠٬٠٠٠"
 */
export function formatInteger(value: number, locale: SupportedLocale): string {
  return formatNumber(value, locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

// ─── Currency Formatter ───────────────────────────────────────────────────────

export type SupportedCurrency = "IQD" | "USD";

/**
 * Format a currency amount with locale-appropriate symbols and digit sets.
 *
 * Examples (amount = 250000, currency = "IQD"):
 *   en → "IQD 250,000"
 *   ar → "٢٥٠٬٠٠٠ د.ع"
 *   ku → "٢٥٠٬٠٠٠ د.ع"
 *
 * Examples (amount = 125.5, currency = "USD"):
 *   en → "$ 125.50"
 *   ar → "١٢٥٫٥٠ دولار"
 *   ku → "١٢٥٫٥٠ دۆلار"
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = "IQD",
  locale: SupportedLocale
): string {
  if (locale === "en") {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: currency === "USD" ? 2 : 0,
      maximumFractionDigits: currency === "USD" ? 2 : 0,
      useGrouping: true,
    }).format(amount);

    return currency === "IQD" ? `IQD ${formatted}` : `$ ${formatted}`;
  }

  // Arabic / Kurdish — Arabic-Indic numerals, symbol after amount
  const formatted = new Intl.NumberFormat("ar-IQ", {
    minimumFractionDigits: currency === "USD" ? 2 : 0,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
    useGrouping: true,
  }).format(amount);

  if (currency === "IQD") {
    return `${formatted} د.ع`;
  }

  // USD symbol differs by language
  const usdLabel = locale === "ar" ? "دولار" : "دۆلار";
  return `${formatted} ${usdLabel}`;
}

/**
 * Compact currency format for tight spaces.
 *
 * Examples (amount = 250000, IQD):
 *   en → "IQD 250K"
 *   ar → "٢٥٠K د.ع"
 *   ku → "٢٥٠K د.ع"
 */
export function formatCurrencyCompact(
  amount: number,
  currency: SupportedCurrency = "IQD",
  locale: SupportedLocale
): string {
  const divisor = amount >= 1_000_000 ? 1_000_000 : amount >= 1_000 ? 1_000 : 1;
  const suffix  = amount >= 1_000_000 ? "M" : amount >= 1_000 ? "K" : "";
  const compact = amount / divisor;

  if (locale === "en") {
    const num = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: compact % 1 === 0 ? 0 : 1,
    }).format(compact);
    return currency === "IQD" ? `IQD ${num}${suffix}` : `$${num}${suffix}`;
  }

  const num = new Intl.NumberFormat("ar-IQ", {
    maximumFractionDigits: compact % 1 === 0 ? 0 : 1,
  }).format(compact);

  const symbol = currency === "IQD" ? "د.ع" : locale === "ar" ? "دولار" : "دۆلار";
  return `${num}${suffix} ${symbol}`;
}

// ─── Relative Time ────────────────────────────────────────────────────────────

/**
 * Format a relative time string (e.g. "2 minutes ago").
 *
 * Examples:
 *   en → "2 minutes ago"
 *   ar → "منذ دقيقتين"
 *   ku → "٢ خولەک لەمەوبەر"
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: SupportedLocale
): string {
  const d     = date instanceof Date ? date : new Date(date);
  const now   = Date.now();
  const diffMs = now - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHrs  = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (locale === "en") {
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (diffDays > 0)  return rtf.format(-diffDays, "day");
    if (diffHrs > 0)   return rtf.format(-diffHrs, "hour");
    if (diffMins > 0)  return rtf.format(-diffMins, "minute");
    return "just now";
  }

  if (locale === "ar") {
    const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
    if (diffDays > 0)  return rtf.format(-diffDays, "day");
    if (diffHrs > 0)   return rtf.format(-diffHrs, "hour");
    if (diffMins > 0)  return rtf.format(-diffMins, "minute");
    return "الآن";
  }

  // Kurdish Sorani manual
  if (diffDays > 0)  return `${toEasternNumerals(diffDays)} ڕۆژ لەمەوبەر`;
  if (diffHrs > 0)   return `${toEasternNumerals(diffHrs)} کاتژمێر لەمەوبەر`;
  if (diffMins > 0)  return `${toEasternNumerals(diffMins)} خولەک لەمەوبەر`;
  return "ئێستا";
}

// ─── Direction helper ─────────────────────────────────────────────────────────

/** Returns true for RTL locales (ar, ku). */
export function isRTL(locale: SupportedLocale): boolean {
  return locale === "ar" || locale === "ku";
}

/** Returns "rtl" | "ltr" for use in dir attributes. */
export function getDirection(locale: SupportedLocale): "rtl" | "ltr" {
  return isRTL(locale) ? "rtl" : "ltr";
}

// ─── Validation message helpers ───────────────────────────────────────────────

/**
 * Returns locale-aware field-required message strings.
 * These mirror the translation keys in auth.json > validation
 * but are available without React context (useful in Zod schemas).
 */
export const VALIDATION_MESSAGES: Record<
  SupportedLocale,
  Record<string, string>
> = {
  en: {
    emailRequired:    "Email address is required",
    emailInvalid:     "Enter a valid email address",
    phoneRequired:    "Phone number is required",
    phoneInvalid:     "Enter a valid phone number",
    passwordRequired: "Password is required",
    passwordMin:      "Password must be at least 6 characters",
    nameRequired:     "Full name is required",
    fieldRequired:    "This field is required",
    nationalIdRequired: "National ID number is required",
    companyRequired:  "Company name is required",
  },
  ar: {
    emailRequired:    "البريد الإلكتروني مطلوب",
    emailInvalid:     "أدخل عنوان بريد إلكتروني صحيح",
    phoneRequired:    "رقم الهاتف مطلوب",
    phoneInvalid:     "أدخل رقم هاتف صحيح",
    passwordRequired: "كلمة المرور مطلوبة",
    passwordMin:      "يجب أن تكون كلمة المرور 6 أحرف على الأقل",
    nameRequired:     "الاسم الكامل مطلوب",
    fieldRequired:    "هذا الحقل مطلوب",
    nationalIdRequired: "رقم بطاقة الهوية مطلوب",
    companyRequired:  "اسم الشركة مطلوب",
  },
  ku: {
    emailRequired:    "ئیمەیڵ پێویستە",
    emailInvalid:     "ئیمەیڵی دروست بنووسە",
    phoneRequired:    "ژمارەی تەلەفۆن پێویستە",
    phoneInvalid:     "ژمارەی تەلەفۆنی دروست بنووسە",
    passwordRequired: "وشەی نهێنی پێویستە",
    passwordMin:      "وشەی نهێنی پێویستە لانی کەم ٦ پیت بێت",
    nameRequired:     "ناوی تەواو پێویستە",
    fieldRequired:    "ئەم خانەیە پێویستە",
    nationalIdRequired: "ژمارەی کارتی نیشتمانی پێویستە",
    companyRequired:  "ناوی کۆمپانیا پێویستە",
  },
};
