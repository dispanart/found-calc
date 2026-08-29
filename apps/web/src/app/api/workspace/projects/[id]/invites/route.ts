import { handleWorkspaceProjectInviteRequest } from "@/lib/workspace/http";
import { getWorkspaceRouteServices, workspaceRouteFailure } from "@/lib/workspace/route-services";

type RouteContext = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return await handleWorkspaceProjectInviteRequest(request, id, getWorkspaceRouteServices());
  } catch { return workspaceRouteFailure(); }
}
