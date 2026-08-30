import type { Locale } from "@/i18n/locales";

const FALLBACK_PATH = (locale: Locale) => `/${locale}/workspace`;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;
const ENCODED_PATH_SEPARATOR = /%(?:2f|5c)/i;

export const safeAuthReturnTo = (raw: string | undefined, locale: Locale): string => {
  const fallback = FALLBACK_PATH(locale);
  if (!raw || raw.length > 2048 || CONTROL_CHARACTER.test(raw) || raw.includes("\\")) return fallback;

  const pathPart = raw.split(/[?#]/, 1)[0] ?? "";
  if (ENCODED_PATH_SEPARATOR.test(pathPart)) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (CONTROL_CHARACTER.test(decoded) || decoded.includes("\\") || decoded.startsWith("//")) return fallback;

  const decodedPath = decoded.split(/[?#]/, 1)[0] ?? "";
  if (decodedPath.split("/").some((segment) => segment === "." || segment === "..")) return fallback;

  try {
    const base = new URL("https://found-calc.invalid");
    const target = new URL(decoded, base);
    if (target.origin !== base.origin || target.username || target.password) return fallback;
    if (target.pathname !== `/${locale}` && !target.pathname.startsWith(`/${locale}/`)) return fallback;
    return raw;
  } catch {
    return fallback;
  }
};
