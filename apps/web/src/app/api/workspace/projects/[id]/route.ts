import { handleWorkspaceProjectRequest } from "@/lib/workspace/http";
import { getWorkspaceRouteServices, workspaceRouteFailure } from "@/lib/workspace/route-services";

type RouteContext = { params: Promise<{ id: string }> };
const handle = async (method: "GET" | "PATCH" | "DELETE", request: Request, context: RouteContext) => {
  try {
    const { id } = await context.params;
    return await handleWorkspaceProjectRequest(method, request, id, getWorkspaceRouteServices());
  } catch { return workspaceRouteFailure(); }
};
export async function GET(request: Request, context: RouteContext) { return handle("GET", request, context); }
export async function PATCH(request: Request, context: RouteContext) { return handle("PATCH", request, context); }
export async function DELETE(request: Request, context: RouteContext) { return handle("DELETE", request, context); }
