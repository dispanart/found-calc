import { handleWidgetRotateKeyRequest } from "@/lib/widgets/http";
import { getWidgetRouteServices, widgetRouteFailure } from "@/lib/widgets/route-services";

type RouteContext = { params: Promise<{ widgetId: string }> };
export async function POST(request: Request, context: RouteContext) {
  try {
    const { widgetId } = await context.params;
    return await handleWidgetRotateKeyRequest(request, widgetId, getWidgetRouteServices());
  } catch { return widgetRouteFailure(); }
}
