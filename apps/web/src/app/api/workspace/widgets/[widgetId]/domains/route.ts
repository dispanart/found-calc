import { handleWidgetDomainsBindingRequest } from "@/lib/widgets/http";
import { getWidgetRouteServices, widgetRouteFailure } from "@/lib/widgets/route-services";

type RouteContext = { params: Promise<{ widgetId: string }> };
const handle = async (request: Request, context: RouteContext) => {
  try {
    const { widgetId } = await context.params;
    return await handleWidgetDomainsBindingRequest(request, widgetId, getWidgetRouteServices());
  } catch { return widgetRouteFailure(); }
};
export async function GET(request: Request, context: RouteContext) { return handle(request, context); }
export async function PUT(request: Request, context: RouteContext) { return handle(request, context); }
