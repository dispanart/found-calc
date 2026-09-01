import { handleWidgetAnalyticsEventRequest } from "@/lib/widgets/analytics";
import { getWidgetRouteServices, widgetRouteFailure } from "@/lib/widgets/route-services";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicWidgetKey: string }> },
) {
  try {
    const { publicWidgetKey } = await params;
    return await handleWidgetAnalyticsEventRequest(request, publicWidgetKey, getWidgetRouteServices());
  } catch {
    return widgetRouteFailure();
  }
}
