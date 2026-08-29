import { handleWorkspaceInviteRedeemRequest } from "@/lib/workspace/http";
import { getWorkspaceRouteServices, workspaceRouteFailure } from "@/lib/workspace/route-services";

export async function POST(request: Request) {
  try { return await handleWorkspaceInviteRedeemRequest(request, getWorkspaceRouteServices()); }
  catch { return workspaceRouteFailure(); }
}
