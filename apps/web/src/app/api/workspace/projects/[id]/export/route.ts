import { handleWorkspaceProjectExportRequest } from "@/lib/workspace/http";
import { getWorkspaceRouteServices, workspaceRouteFailure } from "@/lib/workspace/route-services";

type RouteContext = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return await handleWorkspaceProjectExportRequest(request, id, getWorkspaceRouteServices());
  } catch { return workspaceRouteFailure(); }
}
