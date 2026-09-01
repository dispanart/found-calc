import type { NormalizedWidgetOrigin } from "./contracts";

export type NormalizeWidgetOriginResult =
  | { readonly ok: true; readonly value: NormalizedWidgetOrigin }
  | {
      readonly ok: false;
      readonly code: "invalid-origin" | "https-required" | "port-not-allowed" | "host-not-allowed";
    };

export interface NormalizeWidgetOriginOptions {
  readonly mode: "production" | "development";
  readonly localPorts?: readonly number[];
}

const stripTrailingDot = (hostname: string) => hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;

export const canonicalWidgetDomainPairKey = (hostname: string): string => {
  const normalized = stripTrailingDot(hostname.toLowerCase());
  return normalized.startsWith("www.") && normalized.split(".").length >= 3
    ? normalized.slice(4)
    : normalized;
};

const isLoopback = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

const formatOriginHostname = (hostname: string) => hostname.includes(":") ? `[${hostname}]` : hostname;

const hasExplicitUrlUserinfo = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  const schemeEnd = candidate.indexOf("://");
  const authorityStart = schemeEnd >= 0 ? schemeEnd + 3 : 0;
  const remainder = candidate.slice(authorityStart);
  const authorityEnd = remainder.search(/[/?#]/);
  const authority = authorityEnd === -1 ? remainder : remainder.slice(0, authorityEnd);

  // A literal @ inside the URL authority is the WHATWG userinfo delimiter.
  // Reject the complete username/password form before URL parsing so this
  // security boundary does not need to read credential-bearing URL fields.
  return authority.includes("@");
};

const parseInputUrl = (value: string): URL | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0 || hasExplicitUrlUserinfo(trimmed)) return null;
  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
};

const normalizeRegisteredHostname = (hostname: string): string | null => {
  const trimmed = stripTrailingDot(hostname.trim().toLowerCase());
  if (!trimmed || hasExplicitUrlUserinfo(trimmed)) return null;
  try {
    const url = new URL(`https://${trimmed}`);
    if (url.port || url.pathname !== "/" || url.search || url.hash) return null;
    return stripTrailingDot(url.hostname.toLowerCase());
  } catch {
    return null;
  }
};

export const normalizeWidgetOrigin = (
  value: string,
  options: NormalizeWidgetOriginOptions,
): NormalizeWidgetOriginResult => {
  const url = parseInputUrl(value);
  if (!url || !url.hostname) {
    return { ok: false, code: "invalid-origin" };
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    return { ok: false, code: "invalid-origin" };
  }

  // WHATWG URL canonicalizes internationalized hostnames to ASCII/Punycode in
  // every runtime we support (browser, Node test runner, and Workers), so keep
  // this boundary platform-native instead of importing a Node-only helper.
  const rawHostname = stripTrailingDot(url.hostname.toLowerCase());
  const asciiHostname = rawHostname.startsWith("[") && rawHostname.endsWith("]")
    ? rawHostname.slice(1, -1)
    : rawHostname;
  if (!asciiHostname) return { ok: false, code: "invalid-origin" };

  const local = isLoopback(asciiHostname);
  if (options.mode === "production" && local) {
    return { ok: false, code: "host-not-allowed" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, code: "https-required" };
  }

  const effectivePort = Number(url.port || (url.protocol === "https:" ? "443" : "80"));
  if (local) {
    if (options.mode !== "development") return { ok: false, code: "host-not-allowed" };
    if (!options.localPorts?.includes(effectivePort)) return { ok: false, code: "port-not-allowed" };
  } else {
    if (url.protocol !== "https:") return { ok: false, code: "https-required" };
    if (url.port) return { ok: false, code: "port-not-allowed" };
  }

  const port = url.port ? `:${url.port}` : "";
  const formattedHostname = formatOriginHostname(asciiHostname);
  return {
    ok: true,
    value: {
      origin: `${url.protocol}//${formattedHostname}${port}`,
      hostname: asciiHostname,
      displayHostname: local ? `${formattedHostname}:${effectivePort}` : asciiHostname,
      pairKey: local ? `loopback:${effectivePort}` : canonicalWidgetDomainPairKey(asciiHostname),
      isLocalDevelopment: local && options.mode === "development",
    },
  };
};

export const widgetOriginMatchesDomain = (origin: string, registeredHostname: string): boolean => {
  const normalized = normalizeWidgetOrigin(origin, { mode: "production" });
  if (!normalized.ok) return false;
  const registeredAscii = normalizeRegisteredHostname(registeredHostname);
  if (!registeredAscii) return false;
  return normalized.value.pairKey === canonicalWidgetDomainPairKey(registeredAscii);
};