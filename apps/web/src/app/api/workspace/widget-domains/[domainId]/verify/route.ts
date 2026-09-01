import { handleWidgetDomainVerifyRequest } from "@/lib/widgets/http";
import { getWidgetRouteServices, widgetRouteFailure } from "@/lib/widgets/route-services";

type RouteContext = { params: Promise<{ domainId: string }> };
export async function POST(request: Request, context: RouteContext) {
  try {
    const { domainId } = await context.params;
    return await handleWidgetDomainVerifyRequest(request, domainId, getWidgetRouteServices());
  } catch { return widgetRouteFailure(); }
}
