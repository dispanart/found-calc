import { handleWidgetDomainRequest } from "@/lib/widgets/http";
import { getWidgetRouteServices, widgetRouteFailure } from "@/lib/widgets/route-services";

type RouteContext = { params: Promise<{ domainId: string }> };
const handle = async (request: Request, context: RouteContext) => {
  try {
    const { domainId } = await context.params;
    return await handleWidgetDomainRequest(request, domainId, getWidgetRouteServices());
  } catch { return widgetRouteFailure(); }
};
export async function PATCH(request: Request, context: RouteContext) { return handle(request, context); }
export async function DELETE(request: Request, context: RouteContext) { return handle(request, context); }
