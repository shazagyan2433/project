/** Client-side mirror of api-server business profile validation. */

const BLOCKED_BUSINESS_NAMES = new Set([
  "trutruy", "ghgjh", "gjhgjh", "sheza", "test", "testing", "asdf", "qwerty", "qwer",
  "abc", "xxx", "dummy", "fake", "sample", "user", "admin", "null", "undefined",
]);

export function normalizeBusinessName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidBusinessName(name: string): boolean {
  const normalized = normalizeBusinessName(name);
  if (normalized.length < 3 || normalized.length > 120) return false;
  if (!/^\p{L}/u.test(normalized)) return false;

  const letters = [...normalized].filter((ch) => /\p{L}/u.test(ch));
  if (letters.length < 2) return false;

  const compact = normalized.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (BLOCKED_BUSINESS_NAMES.has(compact)) return false;
  if (/^(.)\1{2,}$/u.test(compact)) return false;
  if (/(.)\1{2,}/u.test(compact)) return false;

  const latinOnly = /^[\p{Script=Latin}\s.'-]+$/u.test(normalized);
  if (latinOnly && normalized.length < 6 && !/\s/.test(normalized)) {
    const vowels = (compact.match(/[aeiouy]/gi) ?? []).length;
    if (vowels === 0) return false;
    if (vowels / letters.length < 0.2) return false;
  }

  return true;
}

export function isValidMobile(mobile: string): boolean {
  const digits = normalizePhone(mobile);
  if (digits.length < 10 || digits.length > 15) return false;
  if (digits.startsWith("964")) return digits.length >= 12;
  if (digits.startsWith("0")) return digits.length >= 10 && digits.length <= 11;
  return digits.length >= 10;
}

export function businessNameErrorKey(name: string): "onboard.errBusinessName" | null {
  return isValidBusinessName(name) ? null : "onboard.errBusinessName";
}

export function mobileErrorKey(mobile: string): "onboard.errPhone" | null {
  return isValidMobile(mobile) ? null : "onboard.errPhone";
}
