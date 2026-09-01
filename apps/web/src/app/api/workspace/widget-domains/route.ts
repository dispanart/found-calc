import { handleWidgetDomainsRequest } from "@/lib/widgets/http";
import { getWidgetRouteServices, widgetRouteFailure } from "@/lib/widgets/route-services";

const handle = async (request: Request) => {
  try { return await handleWidgetDomainsRequest(request, getWidgetRouteServices()); }
  catch { return widgetRouteFailure(); }
};
export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
