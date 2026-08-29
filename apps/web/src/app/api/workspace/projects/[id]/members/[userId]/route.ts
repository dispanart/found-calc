import { handleWorkspaceProjectMemberRequest } from "@/lib/workspace/http";
import { getWorkspaceRouteServices, workspaceRouteFailure } from "@/lib/workspace/route-services";

type RouteContext = { params: Promise<{ id: string; userId: string }> };
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id, userId } = await context.params;
    return await handleWorkspaceProjectMemberRequest(request, id, userId, getWorkspaceRouteServices());
  } catch { return workspaceRouteFailure(); }
}
