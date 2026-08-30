import { handleCommercialWorkspaceGoalRequest } from "@/lib/workspace/commercial-http";
import { getWorkspaceRouteServices, workspaceRouteFailure } from "@/lib/workspace/route-services";

type RouteContext = { params: Promise<{ id: string }> };
const handle = async (method: "PATCH" | "DELETE", request: Request, context: RouteContext) => {
  try {
    const { id } = await context.params;
    return await handleCommercialWorkspaceGoalRequest(method, request, id, getWorkspaceRouteServices());
  } catch { return workspaceRouteFailure(); }
};
export async function PATCH(request: Request, context: RouteContext) { return handle("PATCH", request, context); }
export async function DELETE(request: Request, context: RouteContext) { return handle("DELETE", request, context); }