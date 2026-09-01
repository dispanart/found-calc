import { normalizeWidgetOrigin } from "./domain";

export interface WidgetSecurityEnvironment {
  readonly mode: "production" | "development";
  readonly localPorts?: readonly number[];
}

const hasExplicitUrlUserinfo = (value: string): boolean => {
  const trimmed = value.trim();
  const schemeEnd = trimmed.indexOf("://");
  if (schemeEnd < 0) return false;
  const remainder = trimmed.slice(schemeEnd + 3);
  const authorityEnd = remainder.search(/[/?#]/);
  const authority = authorityEnd === -1 ? remainder : remainder.slice(0, authorityEnd);
  return authority.includes("@");
};

const safeConfiguredOrigin = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed || hasExplicitUrlUserinfo(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
};
const safeNonce = (nonce: string): boolean => /^[A-Za-z0-9+/_-]+$/.test(nonce) && nonce.length <= 256;
const widgetDirectives = (scriptSource: string, frameAncestors: string) => [
  "default-src 'self'", scriptSource, "style-src 'self' 'unsafe-inline'", "connect-src 'self'", "font-src 'self' data:", "img-src 'self' data:",
  "object-src 'none'", "base-uri 'none'", "form-action 'none'", `frame-ancestors ${frameAncestors}`,
].join("; ");

export const buildWidgetCsp = (
  authorizedParentOrigin: string,
  nonce?: string,
  environment: WidgetSecurityEnvironment = { mode: "production" },
): string => {
  const normalized = normalizeWidgetOrigin(authorizedParentOrigin, {
    mode: environment.mode,
    localPorts: environment.localPorts ?? [],
  });
  if (!normalized.ok) throw new TypeError("authorized parent origin must satisfy the widget origin policy");
  if (nonce !== undefined && !safeNonce(nonce)) throw new TypeError("invalid CSP nonce");
  return widgetDirectives(nonce === undefined ? "script-src 'self' 'unsafe-inline'" : `script-src 'self' 'nonce-${nonce}'`, normalized.value.origin);
};

const PREVIEW_FRAME_ANCESTORS = "frame-ancestors 'self'";
export const buildWidgetPreviewCsp = (): string => [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  PREVIEW_FRAME_ANCESTORS,
].join("; ");

export const isEmbedHostRequest = (requestUrl: URL, configuredEmbedOrigin: string): boolean => {
  const configured = safeConfiguredOrigin(configuredEmbedOrigin);
  return configured !== null && requestUrl.origin === configured;
};

const readOnlyMethod = (method: string) => method === "GET" || method === "HEAD" || method === "OPTIONS";
export const isAllowedEmbedHostPath = (pathname: string, method: string): boolean => {
  if (pathname === "/embed.js") return readOnlyMethod(method);
  if (pathname.startsWith("/embed/")) return readOnlyMethod(method);
  if (pathname.startsWith("/api/embed/")) return method === "GET" || method === "POST" || method === "OPTIONS";
  if (pathname.startsWith("/api/rules/")) return readOnlyMethod(method);
  if (pathname.startsWith("/_next/")) return readOnlyMethod(method);
  if (pathname === "/favicon.ico" || pathname === "/robots.txt") return readOnlyMethod(method);
  return false;
};