import { type NextRequest, NextResponse } from "next/server";

import { getWidgetRouteServices } from "@/lib/widgets/route-services";
import { resolvePublicWidgetRuntime } from "@/lib/widgets/runtime";
import { buildWidgetCsp, buildWidgetPreviewCsp, isAllowedEmbedHostPath, isEmbedHostRequest } from "@/lib/widgets/security";

export const config = { matcher: ["/embed/:path*", "/widget-preview/:path*", "/:path*"] };

const sanitizedHeaders = (request: NextRequest) => {
  const headers = new Headers(request.headers);
  headers.delete("x-foundcalc-widget-id");
  headers.delete("x-foundcalc-domain-id");
  headers.delete("x-foundcalc-parent-origin");
  return headers;
};
const nextResponse = (request: NextRequest) => NextResponse.next({ request: { headers: sanitizedHeaders(request) } });
const unavailable = () => new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
const requestContextMatches = (request: NextRequest, parentOrigin: string) => {
  const origin = request.headers.get("origin");
  if (origin !== null) { try { if (new URL(origin).origin !== parentOrigin) return false; } catch { return false; } }
  const referer = request.headers.get("referer");
  if (referer !== null) { try { if (new URL(referer).origin !== parentOrigin) return false; } catch { return false; } }
  return true;
};
const embedKeyFromPath = (pathname: string): string | null => { const match = /^\/embed\/([^/]+)$/.exec(pathname); if (!match?.[1]) return null; try { return decodeURIComponent(match[1]); } catch { return null; } };

export async function proxy(request: NextRequest) {
  const embedOrigin = process.env.FOUNDCALC_EMBED_ORIGIN?.trim();
  const onEmbedHost = embedOrigin !== undefined && embedOrigin.length > 0 && isEmbedHostRequest(request.nextUrl, embedOrigin);
  if (onEmbedHost && !isAllowedEmbedHostPath(request.nextUrl.pathname, request.method)) return unavailable();

  if (request.nextUrl.pathname.startsWith("/widget-preview/")) {
    if (onEmbedHost || (request.method !== "GET" && request.method !== "HEAD")) return unavailable();
    const response = nextResponse(request);
    response.headers.set("Content-Security-Policy", buildWidgetPreviewCsp());
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (request.nextUrl.pathname.startsWith("/embed/")) {
    if (!onEmbedHost) return unavailable();
    const publicWidgetKey = embedKeyFromPath(request.nextUrl.pathname);
    const parentOrigin = request.nextUrl.searchParams.get("parentOrigin");
    if (!publicWidgetKey || !parentOrigin) return unavailable();
    const routeServices = getWidgetRouteServices();
    const runtimeEnvironment = { mode: routeServices.mode, localPorts: routeServices.localPorts } as const;
    const resolved = await resolvePublicWidgetRuntime({ publicWidgetKey, parentOrigin }, {
      widgets: routeServices.widgets,
      domains: routeServices.domains,
      access: routeServices.access,
      ...runtimeEnvironment,
    });
    if (!resolved.ok || !requestContextMatches(request, resolved.value.parentOrigin)) return unavailable();
    const response = nextResponse(request);
    response.headers.set("Content-Security-Policy", buildWidgetCsp(resolved.value.parentOrigin, undefined, runtimeEnvironment));
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  return nextResponse(request);
}
