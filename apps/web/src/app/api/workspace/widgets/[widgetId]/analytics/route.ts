import { cleanupWidgetAnalyticsRetention } from "@/lib/widgets/analytics";
import { handleWidgetAnalyticsRequest } from "@/lib/widgets/http";
import { getWidgetRouteServices, widgetRouteFailure } from "@/lib/widgets/route-services";

type RouteContext = { params: Promise<{ widgetId: string }> };
export async function GET(request: Request, context: RouteContext) {
  try {
    const { widgetId } = await context.params;
    const services = getWidgetRouteServices();
    const response = await handleWidgetAnalyticsRequest(request, widgetId, services);
    if (response.ok) await cleanupWidgetAnalyticsRetention(services);
    return response;
  } catch { return widgetRouteFailure(); }
}
